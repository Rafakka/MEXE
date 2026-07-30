

import styles from "./ReactionField.module.css";
import { useDispatch } from "react-redux";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import {
    stabilizationStarted,
    resultDisplayed,
} from "../../../features/laboratory/laboratorySlice";

type ReactionProps = {

    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
}

export default function ReactionField({

    phase,

    operationPhase,

}: ReactionProps) {

    const dispatch = useDispatch();

    const handleAnimationEnd = (
        event: React.AnimationEvent<HTMLDivElement>
    ) => {

        console.log(

            event.currentTarget,

            event.target,

            event.animationName

        );

        if (
        phase !== "processing" ||
        operationPhase !== "completed"
        ) {
            if (event.target !== event.currentTarget){
                return;
            }

            if (!event.animationName.includes("rotorAcceleration")){
                return;
            }

            if (
                phase === "processing" && operationPhase === "completed"
            ) {
                console.log(">>> stabilizationStarted");
                dispatch(stabilizationStarted());
                return;
            }

            if (phase === "stabilizing") {

                console.log('stabilizing:', event.animationName);

                return;
            }
        }
    };

    const phaseClass = styles[phase]

    const operationClass =
        operationPhase !== "idle"
            ? styles[operationPhase]
            : "";

    return (

        <div
            className={`

                ${styles.field}
                ${phaseClass}
                ${operationClass}
            `}

        >

            <div className={styles.rotorA}
            onAnimationEnd={handleAnimationEnd}>

                <div className={styles.axisA} />

            </div>


            <div className={styles.rotorB}>

                <div className={styles.axisB} />

            </div>


        </div>
    );
}
