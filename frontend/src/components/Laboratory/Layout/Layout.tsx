
import {useEffect, useRef} from "react";
import styles from "./Layout.module.css";
import type { LaboratoryPhase } from "../../../features/laboratory/laboratoryPhase";


type LayoutProps = {
    phase: LaboratoryPhase;
    children: React.ReactNode;
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



export default function Layout({ phase, children }: LayoutProps) {

    const canvasRef = useRef<HTMLCanvasElement>(null);

    const containerRef = useRef<HTMLDivElement>(null);

    const particles = useRef<Particle[]>([]);

    const createParticles = () => {


        const canvas = canvasRef.current;

        if (!canvas) return;

        const width =
            containerRef.current?.clientWidth ?? window.innerWidth;

        const height =
            containerRef.current?.clientHeight ?? window.innerHeight;

        console.log(width, height);

        particles.current = [];

        for(let i=0;i<18;i++){

            const random = Math.random();

            const type= random<0.85 ? "dust" : "star";


            particles.current.push({

                x:Math.random()*width,

                y:Math.random()*height,

                size:3,

                opacity:1,

                targetOpacity:1,

                dx:0,

                dy:0,

                phase:Math.random()*Math.PI*2,

                twinkleSpeed:.003+Math.random()*.004,

                type,

            });

        }

    };


const drawDust=(
    ctx:CanvasRenderingContext2D,

    particle:Particle

    )=>{

    console.log(particle.x,particle.y);

    ctx.beginPath();

    ctx.arc(

        particle.x,

        particle.y,

        particle.size,

        0,

        Math.PI*2

    );

    ctx.fillStyle="red";

    ctx.fill();

    };

const drawStar=(

    ctx,

    particle:Particle

    )=>{


        drawDust(ctx, particle);

        ctx.beginPath();

        ctx.arc(

            particle.x,

            particle.y,

            particle.size*3,

            0,

            Math.PI*2

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

};

const animate = () => {

    console.count("FRAME");

    const width =
    containerRef.current?.clientWidth ?? window.innerWidth;

    const height =
    containerRef.current?.clientHeight ?? window.innerHeight;

    const canvas = canvasRef.current;

    canvas.width = width;
    canvas.height = height;

        if(!canvas) return;

        const ctx = canvas.getContext("2d",{alpha:false});

        console.log(ctx);

        if(!ctx) return;

        ctx.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );

        ctx.fillStyle = "red";

        ctx.fillRect(
            100,
            100,
            100,
            100
        );

        particles.current.forEach((particle)=>{

            particle.phase += particle.twinkleSpeed;

            particle.opacity = particle.targetOpacity*(
                0.55+
                0.45*Math.sin(
                    particle.phase
                    )
                );

            particle.x += particle.dx;

            particle.y += particle.dy;

            if(
                particle.x<0 ||
                particle.x>canvas.width ||
                particle.y<0 ||
                particle.y>canvas.height
            ) {
                particle.x=Math.random()*canvas.width;

                particle.y=Math.random()*canvas.height;
            }
                drawParticle(ctx, particle);

                console.log(particle.type);
            }

        ,

        );

        requestAnimationFrame(animate);

    };

    useEffect(()=>{

        createParticles();

        console.log(canvasRef.current);

        setTimeout(() => {


            animate();


        },1000);

    },[]);

    return (

       <div className={styles.wrapper}>

            <div
                ref={containerRef}
                className={styles.spaceDust}
            >

                <canvas
                    ref={canvasRef}
                    style={{
                    position: "absolute",
                    inset: 0,
                    background: "lime",
                    zIndex: 9999
                }}
                    />

            </div>

            <main
                className={`
                    ${styles.layout}
                    ${styles[phase]}
                `}
            >

                {children}

            </main>

        </div>

    );

}
