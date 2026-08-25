import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import motorcycleLottie from "../../assets/motorcycle-loading.lottie?url";

export function LoginMotorcycleLoader({ name: _name }: { name?: string }) {
  return <div className="login-moto-loader fixed inset-0 z-[200] overflow-hidden bg-white text-slate-950" role="status" aria-live="polite" aria-label="Carregando o sistema">
    <div className="relative z-10 flex h-full flex-col items-center justify-center px-5 text-center">
      <div className="login-moto-road relative h-[250px] w-full max-w-2xl overflow-hidden sm:h-[330px]">
        <div className="login-vector-convoy">
          <AnimatedMotorcycle />
        </div>
      </div>
      <p className="login-moto-caption mt-2 text-sm font-bold tracking-wide text-slate-600">Carregando o sistema...</p>
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
