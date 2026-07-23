
import styles from "../Core/Core.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import CoreSymbol from "../Core/CoreSymbol/CoreSymbol";
import {useEffect, useState, type CSSProperties } from "react";


type CoreProps = {
        phase: LaboratoryPhase;
        onClick: () => void;

    };

export default function Core( {phase, onClick }:CoreProps ) {

    const [hovered, setHovered] = useState(false);

    const orbitVisible = [
        "activated",
        "synchronizing",
        "processing",
        "resetting"
    ].includes(phase);

    useEffect(() => {

    if (phase !== "idle") {

        setHovered(false);

    }

    }, [phase]);

    const outerParticles = [

    { angle: 6,   radius: 196, size: 3, color: "#79C7FF", glow: 6, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 31,  radius: 198, size: 4, color: "#FFFFFF", glow: 7, twinkle: "soft",   twinkleSpeed: 18 },

    { angle: 58,  radius: 194, size: 3, color: "#5DAEFF", glow: 6, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 87,  radius: 200, size: 4, color: "#63E6FF", glow: 8, twinkle: "soft",   twinkleSpeed: 22 },

    { angle: 116, radius: 197, size: 3, color: "#FFFFFF", glow: 5, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 152, radius: 193, size: 4, color: "#6AA8FF", glow: 7, twinkle: "strong", twinkleSpeed: 14 },

    { angle: 204, radius: 199, size: 3, color: "#79C7FF", glow: 6, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 248, radius: 196, size: 4, color: "#BDE7FF", glow: 8, twinkle: "soft",   twinkleSpeed: 20 },

    { angle: 302, radius: 198, size: 3, color: "#FFFFFF", glow: 5, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 341, radius: 194, size: 4, color: "#63E6FF", glow: 8, twinkle: "soft",   twinkleSpeed: 17 },

    ];

    const middleParticles = [

    { angle: 18,  radius: 183, size: 4, color: "#6AA8FF", glow: 8, twinkle: "soft",   twinkleSpeed: 10 },

    { angle: 43,  radius: 181, size: 5, color: "#63E6FF", glow: 10, twinkle: "strong", twinkleSpeed: 8 },

    { angle: 71,  radius: 184, size: 4, color: "#FFFFFF", glow: 7, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 105, radius: 182, size: 5, color: "#79C7FF", glow: 9, twinkle: "soft",   twinkleSpeed: 11 },

    { angle: 138, radius: 180, size: 4, color: "#8B5CF6", glow: 10, twinkle: "strong", twinkleSpeed: 15 },

    { angle: 176, radius: 185, size: 5, color: "#63E6FF", glow: 9, twinkle: "soft",   twinkleSpeed: 9 },

    { angle: 213, radius: 182, size: 4, color: "#FFFFFF", glow: 7, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 249, radius: 181, size: 5, color: "#6AA8FF", glow: 10, twinkle: "strong", twinkleSpeed: 13 },

    { angle: 296, radius: 184, size: 4, color: "#79C7FF", glow: 8, twinkle: "soft",   twinkleSpeed: 16 },

    { angle: 334, radius: 183, size: 5, color: "#63E6FF", glow: 10, twinkle: "none",   twinkleSpeed: 0 },

    ];

    const innerParticles = [

    { angle: 12,  radius: 168, size: 5, color: "#FFFFFF", glow: 10, twinkle: "strong", twinkleSpeed: 7 },

    { angle: 54,  radius: 170, size: 6, color: "#63E6FF", glow: 12, twinkle: "soft",   twinkleSpeed: 9 },

    { angle: 93,  radius: 167, size: 5, color: "#6AA8FF", glow: 10, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 142, radius: 171, size: 6, color: "#8B5CF6", glow: 13, twinkle: "strong", twinkleSpeed: 6 },

    { angle: 189, radius: 169, size: 5, color: "#FFFFFF", glow: 10, twinkle: "soft",   twinkleSpeed: 10 },

    { angle: 236, radius: 167, size: 6, color: "#63E6FF", glow: 12, twinkle: "strong", twinkleSpeed: 8 },

    { angle: 281, radius: 170, size: 5, color: "#79C7FF", glow: 10, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 329, radius: 168, size: 6, color: "#6AA8FF", glow: 12, twinkle: "soft",   twinkleSpeed: 11 },

    ];

    const reverseParticles = [

    { angle: 38,  radius: 188, size: 3, color: "#FFFFFF", glow: 7, twinkle: "soft",   twinkleSpeed: 19 },

    { angle: 121, radius: 176, size: 4, color: "#63E6FF", glow: 8, twinkle: "none",   twinkleSpeed: 0 },

    { angle: 208, radius: 192, size: 3, color: "#79C7FF", glow: 6, twinkle: "strong", twinkleSpeed: 15 },

    { angle: 286, radius: 173, size: 4, color: "#FFFFFF", glow: 8, twinkle: "soft",   twinkleSpeed: 21 },

    { angle: 347, radius: 185, size: 3, color: "#8B5CF6", glow: 7, twinkle: "none",   twinkleSpeed: 0 },

    ];

    const renderOrbitLayer = (
    particles: typeof outerParticles,
    rotorClass: string
) => (

    <div className={`
        ${styles.rotor}
        ${rotorClass}


        `}>

        {particles.map((particle, index) => (

            <span

                key={index}

                className={`
                    ${styles.orbitParticle}

                    ${
                        particle.twinkle === "soft"
                            ? styles.twinkleSoft
                            : ""
                    }

                    ${
                        particle.twinkle === "strong"
                            ? styles.twinkleStrong
                            : ""
                    }
                `}

                style={{

                    "--angle": `${particle.angle}deg`,

                    "--size": `${particle.size}px`,

                    "--color": particle.color,

                    "--glow": `${particle.glow}px`,

                    "--twinkle-speed": `${particle.twinkleSpeed}s`

                } as CSSProperties}

            />

        ))}

    </div>

); return (

    <div

    className={`
        ${styles.core}
        ${styles[phase]}
        ${
            hovered
                ? styles.hover
                : ""
        }
    `}
    onMouseEnter={() => {
        if (phase === "idle") {
            setHovered(true);
        }
    }}
    onMouseLeave={() => {
        if (phase === "idle") {
            setHovered(false);
        }
    }}
    onClick={onClick}
    >

    <div

      className={`
        ${phase === "idle" && hovered
          ? styles.hover
          : ""}
      `}

    />


    <div className={styles.aura} />

    <div className={`
            ${styles.orbit}
                ? styles.visible
                : styles.hidden
        }
    `}

    >

    {renderOrbitLayer(

        outerParticles,

        styles.outer

    )}

    {renderOrbitLayer(

        middleParticles,

        styles.middle

    )}

    {renderOrbitLayer(

        innerParticles,

        styles.inner

    )}

    {renderOrbitLayer(

        reverseParticles,

        styles.reverse

    )}

    </div>

    <div className={styles.halo} />

    <div className={styles.planet} />

    <CoreSymbol
      phase={phase}
      hovered={hovered}
    />

  </div>

);

}
