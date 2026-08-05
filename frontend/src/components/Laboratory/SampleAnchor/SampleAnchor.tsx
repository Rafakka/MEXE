
import {useDispatch} from "react-redux";
import type { AppDispatch } from "../../../store/store";
import styles from "./SampleAnchor.module.css";
import {sampleArrived} from "../../../features/laboratory/laboratorySlice";
import {waitForSamples} from "../../../features/laboratory/laboratoryThunks";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";

type SampleAnchorProps = {
    side: "left" | "right";
    visible: boolean;
    floating:boolean;
    phase:LaboratoryPhase;
    children: React.ReactNode;
};

export default function SampleAnchor({
    side,
    visible,
    floating,
    phase,
    children,
}: SampleAnchorProps) {

    console.log({
    phase,
    visible,
    floating
    });

    const dispatch = useDispatch<AppDispatch>();


        console.log({
        phase,
        side,
        className:`
        ${styles.anchor}
        ${styles[phase]}
        ${side === "left" ? styles.left : styles.right}`
        });

    const handleAnimationEnd = (event: React.AnimationEvent<HTMLDivElement>) => {

        console.log({
        side,
        animation: event.animationName,
        phase
        });

        const name = event.animationName;

        console.log("ANCHOR END", event.animationName);

        if (
        side === "left" &&
        !name.includes("mergeLeft")
        ) {
        return;
        }

        if (
        side === "right" &&
        !name.includes("mergeRight")
        ) {
        return;
        }

        console.log(
            "Sample arrived",
            name
        );

        dispatch(sampleArrived());

        console.log(
            "WAIT FOR SAMPLES"
        );

        dispatch(waitForSamples());

        console.log("LEFT END", event.animationName, performance.now());

        };

    return (
        <div
           className={`
                ${styles.anchor}
                ${side === "left" ? styles.left : styles.right}
                ${visible ? styles.visible : styles.hidden}
                ${styles[phase]}
            ${
                phase !== "processing" &&
                floating &&
                side === "left"
                ? styles.floatingLeft
                : ""
            }
            ${
            phase !== "processing" &&
            floating &&
            side === "right"
            ? styles.floatingRight
            : ""
            }
        `}
        onAnimationEnd={handleAnimationEnd}
    >
    {children}
        </div>
    );
}
