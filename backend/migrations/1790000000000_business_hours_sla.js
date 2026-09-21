/** SLA: America/Fortaleza, segunda–sexta 08–12 e 14–18, sábado 08–12. */
exports.up = (pgm) => pgm.sql(`
  -- Os timestamps sem fuso seguem o TimeZone da sessão, como CURRENT_TIMESTAMP
  -- e as colunas existentes. O calendário é sempre interpretado em Fortaleza.
  CREATE FUNCTION sla_business_seconds(start_at timestamp, end_at timestamp)
  RETURNS double precision LANGUAGE plpgsql STABLE STRICT AS $$
  DECLARE
    a timestamp := start_at::timestamptz AT TIME ZONE 'America/Fortaleza';
    b timestamp := end_at::timestamptz AT TIME ZONE 'America/Fortaleza';
    d timestamp; closing timestamp; total double precision := 0;
  BEGIN
    IF b < a THEN RETURN -sla_business_seconds(end_at, start_at); END IF;
    d := date_trunc('day', a);
    WHILE d < b LOOP
      IF extract(isodow FROM d) < 7 THEN
        closing := d + CASE WHEN extract(isodow FROM d) = 6 THEN interval '12 hours' ELSE interval '18 hours' END;
        total := total + greatest(0, extract(epoch FROM least(b, closing) - greatest(a, d + interval '8 hours')));
        IF extract(isodow FROM d) < 6 THEN
          total := total - greatest(0, extract(epoch FROM least(b, d + interval '14 hours') - greatest(a, d + interval '12 hours')));
        END IF;
      END IF;
      d := d + interval '1 day';
    END LOOP;
    RETURN total;
  END $$;

  CREATE FUNCTION sla_add_business_seconds(start_at timestamp, seconds double precision)
  RETURNS timestamp LANGUAGE plpgsql STABLE STRICT AS $$
  DECLARE
    cursor_at timestamp := start_at::timestamptz AT TIME ZONE 'America/Fortaleza';
    remaining double precision := abs(seconds);
    d timestamp; opening timestamp; closing timestamp; available double precision;
  BEGIN
    IF seconds = 0 THEN RETURN start_at; END IF;
    IF seconds = 'Infinity'::double precision OR seconds = '-Infinity'::double precision OR seconds = 'NaN'::double precision THEN
      RAISE EXCEPTION 'Invalid SLA duration';
    END IF;
    WHILE remaining > 0 LOOP
      d := date_trunc('day', cursor_at);
      opening := d + interval '8 hours';
      closing := d + CASE WHEN extract(isodow FROM d) = 6 THEN interval '12 hours' ELSE interval '18 hours' END;
      IF seconds > 0 THEN
        IF extract(isodow FROM d) = 7 OR cursor_at >= closing THEN
          cursor_at := d + interval '1 day'; CONTINUE;
        END IF;
        cursor_at := greatest(cursor_at, opening);
        IF extract(isodow FROM d) < 6 THEN
          IF cursor_at < d + interval '12 hours' THEN
            closing := d + interval '12 hours';
          ELSE
            cursor_at := greatest(cursor_at, d + interval '14 hours');
          END IF;
        END IF;
        available := extract(epoch FROM closing - cursor_at);
        IF remaining <= available THEN
          cursor_at := cursor_at + remaining * interval '1 second'; EXIT;
        END IF;
        remaining := remaining - available;
        cursor_at := closing;
      ELSE
        IF extract(isodow FROM d) = 7 OR cursor_at <= opening THEN
          cursor_at := d - interval '1 day' + interval '18 hours'; CONTINUE;
        END IF;
        cursor_at := least(cursor_at, closing);
        IF extract(isodow FROM d) < 6 THEN
          IF cursor_at > d + interval '14 hours' THEN
            opening := d + interval '14 hours';
          ELSE
            cursor_at := least(cursor_at, d + interval '12 hours');
          END IF;
        END IF;
        available := extract(epoch FROM cursor_at - opening);
        IF remaining <= available THEN
          cursor_at := cursor_at - remaining * interval '1 second'; EXIT;
        END IF;
        remaining := remaining - available;
        cursor_at := opening;
      END IF;
    END LOOP;
    RETURN (cursor_at AT TIME ZONE 'America/Fortaleza')::timestamp;
  END $$;

  -- Transição prospectiva: preserva o saldo dos chamados em andamento, inclusive
  -- os já vencidos. Não há histórico suficiente para reconstituir pausas antigas.
  -- Chamados aguardando usuário mantêm o instante de referência da pausa.
  UPDATE chamados SET
    sla_limite_resposta = CASE WHEN primeira_resposta_em IS NULL AND sla_limite_resposta > COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp)
      THEN sla_add_business_seconds(COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp), extract(epoch FROM sla_limite_resposta - COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp))::double precision)
      ELSE sla_limite_resposta END,
    sla_limite_resolucao = CASE WHEN sla_limite_resolucao > COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp)
      THEN sla_add_business_seconds(COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp), extract(epoch FROM sla_limite_resolucao - COALESCE(sla_pausado_em, CURRENT_TIMESTAMP::timestamp))::double precision)
      ELSE sla_limite_resolucao END
  WHERE status NOT IN ('RESOLVED', 'CLOSED', 'CANCELED')
    AND sla_limite_resolucao IS NOT NULL;
`);

// Os prazos convertidos não podem voltar a horas corridas sem perder informação.
exports.down = () => { throw new Error('SLA comercial exige restauração do backup para reversão dos prazos.'); };
