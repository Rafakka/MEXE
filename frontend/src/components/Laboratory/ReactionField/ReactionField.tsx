

import styles from "./ReactionField.module.css";
import { useDispatch } from "react-redux";
import type {AppDispatch} from "../../../store/store";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import {startProcessing} from "../../../features/laboratory/laboratoryThunks";
import {collapseStarted, resultDisplayed} from "../../../features/laboratory/laboratorySlice";

type ReactionProps = {

    phase: LaboratoryPhase;
    operationPhase: OperationPhase;
}

export default function ReactionField({

    phase,

    operationPhase,

}: ReactionProps) {

    const dispatch = useDispatch<AppDispatch>();

   const handleAnimationEnd = (
    event: React.AnimationEvent<HTMLDivElement>
    ) => {

    console.log("REACTION FIELD HANDLE ANIMATION REAGINDO");

    const name = event.animationName;

    console.log(name);

    console.log("ACIMA TEM UM NAME DE animationName");

    console.log("AXIS REVEAL", performance.now());

    switch (operationPhase) {

        case "revealing": {

            if (!name.includes("axisAReveal")) {

                return;

            }

            console.log("PROCESSING DO REACTIONFIELD INICIANDO");

            dispatch(startProcessing());

            return;

        }

        case "accelerating":

            if(!name.includes("rotorAcceleration")) return;

            console.log("COLLAPSE DO REACTIONFIELD INICIANDO");

            dispatch(collapseStarted());

            return;

        case "collapse":

            if(!name.includes("rotorCollapse")) return;

            console.log("RETURNDISPLAY DO REACTIONFIELD INICIANDO");

            dispatch(resultDisplayed());

            return;

        }
    };

    const operationClass =
        operationPhase !== "idle"
            ? styles[operationPhase]
            : "";

    return (

        <div className={styles.field}>

            <div className={`${styles.rotorA} ${styles[operationPhase]}`}

            onAnimationEnd={handleAnimationEnd}

            >

                <div className={styles.axisA}

                onAnimationEnd={handleAnimationEnd}

                />

            </div>

        <div className={`${styles.rotorB} ${styles[operationPhase]}`}

        onAnimationEnd={handleAnimationEnd}

        >

            <div className={styles.axisB}

            onAnimationEnd={handleAnimationEnd}

            />

            </div>

        </div>

    );

}

