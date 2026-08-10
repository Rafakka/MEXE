
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

    depth: number;

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


    const getRadialVelocity = (
        x: number,
        y: number,
        width: number,
        height: number,
        depth: number
    ) => {

        const centerX = width / 2;
        const centerY = height / 2;

        const dx = x - centerX;
        const dy = y - centerY;

        const distance = Math.sqrt(
        dx * dx + dy * dy
        );

        if (distance === 0) {
            return {
                dx: 0,
                dy: 0
            };
        }

        const speed = 0.18 * depth;

        return {
            dx: (dx / distance) * speed,
            dy: (dy / distance) * speed
        };
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

            const depth= Math.random();

            const centerX = width / 2;
            const centerY = height / 2;

            const initialRadius = 250 + Math.random() * 360;

            const angle = Math.random() * Math.PI * 2;

            const DEBUG = debug !== "off";

            const x = centerX + Math.cos(angle) * initialRadius;

            const y = centerY + Math.sin(angle) * initialRadius;


            const velocity = getRadialVelocity(
            x,
            y,
            width,
            height,
            depth
            );

            return {

                x,

                y,

                depth,

                size:
                    DEBUG

                        ? 10

                        :.3+Math.random()*1.3,

                opacity:
                    DEBUG
                        ?1
                        :.08,

                targetOpacity:
                    DEBUG
                        ?1
                        :.08,

                dx:
                    DEBUG
                        ?0
                        :velocity.dx,

                dy:
                    DEBUG
                        ?0
                        :velocity.dy,

                phase:Math.random()*Math.PI*2,

                twinkleSpeed:
                    .003+
                    Math.random()*.004,

                type,

            };

    };

    const getDepthScale = (depth: number) => {

    return 0.5 + depth * 1;

    };

    const createParticles = () => {

    const width =
    containerRef.current?.clientWidth ?? window.innerWidth;

    const height =
    containerRef.current?.clientHeight ?? window.innerHeight;

    particles.current=[];

    for(let i=0;i<28;i++){

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

            particle.size * .20,

            0,

            Math.PI*2

            );

        ctx.fillStyle = `rgba(
            255,
            255,
            255,
        ${particle.opacity * .12}
        )`;

        ctx.fill();

        };


  const drawStar = (

        ctx: CanvasRenderingContext2D,

        particle: Particle

        ) => {

        const scale = getDepthScale(particle.depth);

        const depthOpacity = 0.35 + particle.depth * 0.30;

    //--------------------------------
    // Glow externo
    //--------------------------------

        const glowRadius = particle.size * scale * ( 0.5 + particle.opacity * .7 );

        const glow = ctx.createRadialGradient(

            particle.x,

            particle.y,

            0,

            particle.x,

            particle.y,

            glowRadius
        );

        glow.addColorStop(0,`rgba(255,255,255,${particle.opacity * .75})`);

        glow.addColorStop(.08,`rgba(200,230,255,${particle.opacity * .35})`);

        glow.addColorStop(.20,`rgba(180,220,255,${particle.opacity * .16})`);

        glow.addColorStop(.40,`rgba(180,220,255,${particle.opacity * .05})`);

        glow.addColorStop(.65,`rgba(180,220,255,${particle.opacity * .015})`);

        glow.addColorStop(1,"rgba(255,255,255,0)");

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

        const opacity = particle.opacity * depthOpacity;

        ctx.beginPath();

        ctx.fillStyle = `rgba(180,220,255,${opacity * .10})`;

        ctx.arc(

            particle.x,

            particle.y,

            glowRadius,

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

            particle.size * scale * 0.22,

            0,

            Math.PI * 2

        );

        ctx.fill();

        //--------------------------------
        // Flare
        //--------------------------------

        ctx.lineCap = "round";

        const flareSize =
            particle.size * scale * (0.8 + opacity * .35);

        ctx.beginPath();

        ctx.strokeStyle =
        `rgba(255,255,255,${opacity * .8})`;

        ctx.lineWidth = 0.6;

        ctx.moveTo(
            particle.x - flareSize,
            particle.y
        );

        ctx.lineTo(
        particle.x + flareSize,
        particle.y
        );

        ctx.stroke();

        ctx.beginPath();

        ctx.moveTo(
        particle.x,
        particle.y - flareSize
        );

        ctx.lineTo(
        particle.x,
        particle.y + flareSize
        );

        ctx.stroke();

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


    const respawnParticle = (
    particle: Particle,
    canvas: CanvasBounds
    ) => {

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    const angle =
        Math.random() * Math.PI * 2;

    const radius =
        250 + Math.random() * 360;

    particle.x =
        centerX +
        Math.cos(angle) * radius;

    particle.y =
        centerY +
        Math.sin(angle) * radius;

    const dx =
        particle.x - centerX;

    const dy =
        particle.y - centerY;

    const distance =
        Math.sqrt(dx * dx + dy * dy);

    const speed =
        0.08 * particle.depth;

    particle.dx =
        (dx / distance) * speed;

    particle.dy =
        (dy / distance) * speed;
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

       if (
            particle.x < 0 ||
            particle.x > canvas.width ||
            particle.y < 0 ||
            particle.y > canvas.height
        ) {

            respawnParticle(
                particle,
                canvas
            );

        }
    };

    const animate = () => {

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
