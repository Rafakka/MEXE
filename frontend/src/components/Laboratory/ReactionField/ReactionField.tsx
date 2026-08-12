

import { useDispatch } from "react-redux";
import type { AppDispatch } from "../../../store/store";
import styles from "./ReactionField.module.css";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import {collapseStarted, completedStarted} from "../../../features/laboratory/laboratorySlice";

type ReactionProps = {

    operationPhase: OperationPhase;
    onAxisRevealEnd: () => void;

}

export default function ReactionField({

    operationPhase,
    onAxisRevealEnd

    }: ReactionProps) {

    const dispatch = useDispatch<AppDispatch>();

   const handleAxisAnimationEnd = (
    event: React.AnimationEvent<HTMLDivElement>
    ) => {

        const name = event.animationName;


        if (event.target !== event.currentTarget){

            return;

            }

        if (!name.includes("axisAReveal")) {

            return;

            }

        onAxisRevealEnd();

    };

    const handleRotorAnimationEnd = (
    event: React.AnimationEvent<HTMLDivElement>
    ) => {

        console.log("ROTOR ANIMATION END")

        const name = event.animationName;

        console.log(
        "EVENT",
        operationPhase,
        name
        );

        switch(operationPhase) {

            case "accelerating":

                if (event.target !== event.currentTarget){

                return;

                }

                if(!name.includes("rotorAcceleration")) return;

                console.log("COLLAPSING STARTED");

                dispatch(collapseStarted());

                console.log(operationPhase);

                return;

            case "collapse":

                if (event.target !== event.currentTarget){

                return;

                }

                if(!name.includes("rotorCollapse")) return;

                console.log("COMPLETED AND RESULT STARTING");

                dispatch(completedStarted());

                console.log(operationPhase);

                return;
            }
        };


    return (

        <div className={styles.field}>

            <div className={`${styles.rotorA} ${styles[operationPhase]}`}

             onAnimationEnd={handleRotorAnimationEnd}

            >

                <div className={styles.axisA}

                onAnimationEnd={handleAxisAnimationEnd}

                />

            </div>

        <div className={`${styles.rotorB} ${styles[operationPhase]}`}>

            <div className={styles.axisB}/>

            </div>

        </div>

    );

}

