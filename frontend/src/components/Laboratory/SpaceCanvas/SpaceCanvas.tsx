
import {useEffect, useRef} from "react";
import styles from "./SpaceCanvas.module.css";
import type { LaboratoryPhase } from "../../../features/laboratory/laboratoryPhase";
import type { OperationPhase} from "../../../features/laboratory/operationPhase";

export type SpaceCanvasDebugMode =

    | "off"

    | "dust"

    | "star"

    | "all";


type SpaceCanvasProps = {
    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
    debug:SpaceCanvasDebugMode;
};

type ParticleType =

    "dust"

    |

    "star";

type Particle ={

    x:number;

    y:number;

    size:number;

    opacity:number;

    targetOpacity:number;

    dx:number;

    dy:number;

    phase:number;

    twinkleSpeed:number;

    type:ParticleType;
}



export default function SpaceCanvas({ phase, operationPhase, debug }: SpaceCanvasProps) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const particles = useRef<Particle[]>([]);

    type CanvasBounds = {

    width:number;

    height:number;

    };


    const resizeCanvas = () => {

    const canvas = canvasRef.current;

    if (!canvas) return;

    const width =
        containerRef.current?.clientWidth ?? window.innerWidth;

    const height =
        containerRef.current?.clientHeight ?? window.innerHeight;

    if(canvas.width!==width){

        canvas.width=width;

        }

    if(canvas.height!==height){

        canvas.height=height;

        }

    };

    const createParticle = (

        width:number,

        height:number,

        debug:SpaceCanvasDebugMode


    ):Particle => {

        let type:ParticleType;

            switch(debug){

                case "dust":

                    type = "dust";

                break;

                case "star":

                    type = "star";

                break;

                case "all":

                    type = Math.random()<0.5

                    ? "dust"

                    : "star";

                break;

            default:

                const random = Math.random();

                type = random<0.85

                ? "dust"

                : "star";

            }

            const DEBUG = debug !== "off";

            return {

                x:Math.random()*width,

                y:Math.random()*height,

                size:
                    DEBUG

                        ? 10

                        :.3+Math.random()*1.3,

                opacity:
                    DEBUG
                        ?1
                        :.20,

                targetOpacity:
                    DEBUG
                        ?1
                        :.20,

                dx:
                    DEBUG
                        ?0
                        :(Math.random()-.5)*.003,

                dy:
                    DEBUG
                        ?0
                        :(Math.random()-.5)*.003,

                phase:Math.random()*Math.PI*2,

                twinkleSpeed:
                    .003+
                    Math.random()*.004,

                type,

            };

    };

    const createParticles = () => {

    const width =
    containerRef.current?.clientWidth ?? window.innerWidth;

    const height =
    containerRef.current?.clientHeight ?? window.innerHeight;

    particles.current=[];

    for(let i=0;i<40;i++){

        particles.current.push(

            createParticle(

                width,

                height,

                debug

            )

        );

    }

    };

    const drawDust=(
        ctx:CanvasRenderingContext2D,

        particle:Particle

        )=>{

        ctx.beginPath();

        ctx.arc(

            particle.x,

            particle.y,

            particle.size * .45,

            0,

            Math.PI*2

            );

        ctx.fillStyle = `rgba(
            255,
            255,
            255,
        ${particle.opacity * .25}
        )`;

        ctx.fill();

        };


  const drawStar = (

        ctx: CanvasRenderingContext2D,

        particle: Particle

        ) => {

    //--------------------------------
    // Glow externo
    //--------------------------------

        const glowRadius = particle.size * ( 4 + particle.opacity * 2 );

        const glow = ctx.createRadialGradient(

            particle.x,

            particle.y,

            0,

            particle.x,

            particle.y,

            glowRadius
        );

        glow.addColorStop(0,   "rgba(255,255,255,1)");

        glow.addColorStop(.15, "rgba(180,220,255,.45)");

        glow.addColorStop(.45, "rgba(180,220,255,.15)");

        glow.addColorStop(1,   "rgba(255,255,255,0)");

        ctx.save();

        ctx.beginPath();

        ctx.fillStyle = glow;

        ctx.arc(

            particle.x,

            particle.y,

            glowRadius,

            0,

            Math.PI * 2

            );

        ctx.fill();

        ctx.restore();

        ctx.beginPath();

        ctx.fillStyle = `rgba(180,220,255,${particle.opacity * .55})`;

        ctx.arc(

            particle.x,

            particle.y,

            particle.size * 2.2,

            0,

            Math.PI * 2

            );

        ctx.fill();

    //--------------------------------
    // Núcleo
    //--------------------------------

        ctx.beginPath();

        ctx.fillStyle = "#EAF8FF";

        ctx.arc(

            particle.x,

            particle.y,

            particle.size *(0.9 + particle.opacity * .2),

            0,

            Math.PI * 2

        );

        ctx.fill();

        };

    const drawParticle = (

    ctx: CanvasRenderingContext2D,

    particle: Particle

    ) => {

    switch (particle.type) {

        case "dust":

            drawDust(ctx, particle);

            break;

        case "star":

            drawStar(ctx, particle);

            break;

        }

        ctx.lineCap = "round";

        ctx.beginPath();

        ctx.strokeStyle = `rgba(255,255,255,${particle.opacity * .8})`;

        ctx.lineWidth = 1.2;

        ctx.moveTo(

        particle.x - particle.size * ( 2 + particle.opacity * 2),

        particle.y

        );

        ctx.lineTo(

        particle.x + particle.size * ( 2 + particle.opacity * 2),

        particle.y

        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(

            particle.x,

            particle.y - particle.size * ( 2 + particle.opacity * 2),

        );

        ctx.lineTo(

            particle.x,

            particle.y + particle.size * ( 2 + particle.opacity * 2),

        );

        ctx.stroke();

    };


    const updateParticle = (

        particle: Particle,

        canvas: CanvasBounds

    ) => {

        particle.phase += particle.twinkleSpeed;

        particle.opacity =

        particle.targetOpacity *

        (

            0.55 +

            0.45 *

            Math.sin(

                particle.phase

                )

            );

        particle.x += particle.dx;

        particle.y += particle.dy;

        if(

            particle.x < 0 ||

            particle.x > canvas.width ||

            particle.y < 0 ||

            particle.y > canvas.height

        ){

            particle.x = Math.random() * canvas.width;

            particle.y = Math.random() * canvas.height;

        }

    };

    const animate = () => {

        console.count("FRAME");

        const canvas = canvasRef.current;

            if(!canvas) return;

        const ctx = canvas.getContext("2d");

            if(!ctx) return;

            ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

            ctx.fillStyle = "red";

            particles.current.forEach((particle)=>{

                updateParticle(
                    particle,
                    {
                        width: canvas.width,

                        height: canvas.height
                    }

                );

                drawParticle(
                    ctx,
                    particle
                );

            });

            requestAnimationFrame(animate);

    };

    useEffect(()=>{

        resizeCanvas();

        createParticles();

        animate();


    },[debug]);

   return (

       <div
            ref={containerRef}
            className={`
                ${styles.canvasLayer}
                ${styles[phase]}
                ${styles[operationPhase]}
                `}
            >

            <canvas ref={canvasRef}/>

        </div>


    );

    }
