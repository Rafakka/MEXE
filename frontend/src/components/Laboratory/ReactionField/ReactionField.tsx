

import styles from "./ReactionField.module.css";
import { useDispatch } from "react-redux";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import {
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

    const name = event.animationName;

    switch (phase) {

        case "stabilizing": {

            if (!name.includes("rotorAcceleration")) return;

                dispatch(resultDisplayed()); return;
            }

        }

    console.log({
    phase,
    operationPhase,
    });

    };

    const phaseClass = styles[phase]

    const operationClass =
        operationPhase !== "idle"
            ? styles[operationPhase]
            : "";

    console.log({

    phase,

    operationPhase,

    phaseClass,

    operationClass

    });

    return (

        <div className={styles.field}>

            <div className={`${styles.rotorA} ${styles[operationPhase]}`}>

                <div className={styles.axisA}/>

            </div>

        <div className={`${styles.rotorB} ${styles[operationPhase]}`}>

            <div className={styles.axisB}/>

            </div>

        </div>

    );

}

