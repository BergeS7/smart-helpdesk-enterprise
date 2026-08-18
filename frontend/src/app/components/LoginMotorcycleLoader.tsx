import { useEffect, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import motorcycleLottie from "../../assets/motorcycle-loading.lottie?url";
import loadingLottie from "../../assets/loading.lottie?url";

const stages = ["Validando sessão", "Carregando permissões", "Preparando seus chamados", "Tudo pronto"];

export function LoginMotorcycleLoader({ name }: { name?: string }) {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [620, 1300, 2050].map((delay, index) => window.setTimeout(() => setStage(index + 1), delay));
    return () => timers.forEach(window.clearTimeout);
  }, []);

  return <div className="login-moto-loader fixed inset-0 z-[200] overflow-hidden bg-white text-slate-950" role="status" aria-live="polite" aria-label={stages[stage]}>
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
      <div className="login-moto-copy">
        <p className="text-[10px] font-bold uppercase tracking-[.3em] text-red-600">Smart HelpDesk</p>
        <h1 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl">Bem-vindo{name ? `, ${name.split(" ")[0]}` : ""}</h1>
        <p className="mt-2 text-sm text-slate-500">Preparando seu ambiente de trabalho.</p>
      </div>

      <div className="login-moto-road relative mt-7 h-[165px] w-full max-w-xl overflow-hidden sm:h-[195px]">
        <div className="login-vector-convoy">
          <AnimatedMotorcycle />
        </div>
      </div>

      <div className="login-loading-status mt-3 flex flex-col items-center">
        <DotLottieReact
          className="login-loading-lottie"
          src={loadingLottie}
          autoplay
          loop
          layout={{ fit: "contain", align: [0.5, 0.5] }}
          aria-hidden="true"
        />
        <span className="mt-1 text-[11px] font-semibold text-slate-600">{stages[stage]}</span>
      </div>
    </div>
  </div>;
}

function AnimatedMotorcycle() {
  return <DotLottieReact
    className="login-animated-moto"
    src={motorcycleLottie}
    autoplay
    loop
    speed={1.15}
    layout={{ fit: "contain", align: [0.5, 0.5] }}
    aria-label="Motocicleta animada"
  />;
}
