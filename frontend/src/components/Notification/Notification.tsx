

import styles from "./Notification.module.css";

import type { LaboratoryNotification } from "../../features/laboratory/laboratorySlice";
import type { OperationPhase } from "../../features/laboratory/operationPhase";
import type { LaboratoryPhase } from  "../../features/laboratory/laboratoryPhase";

interface NotificationProps {

    notification: LaboratoryNotification | null;
    phase: LaboratoryPhase,
    operationPhase: OperationPhase,
    visible: boolean,
    resetting: boolean,

}

export default function Notification({

    notification,
    phase,
    operationPhase,
    visible,
    resetting,

}: NotificationProps) {

    if (!notification) {

        return null;

    }

    const className = [
        styles.notification,
        styles[phase],
        styles[operationPhase],
        styles[notification.type],
        visible ? styles.visible : styles.hidden,
        resetting ? styles.resetting: "",

    ].join(" ");

    console.log({
    visible,
    resetting,
    phase,
    operationPhase
    });


    return (

        <aside className={className}>

            <h3>{notification.title}</h3>

            <p>{notification.message}</p>

        </aside>
    );

}
