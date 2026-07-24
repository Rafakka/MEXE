

import styles from "./Notification.module.css";

import type { LaboratoryNotification } from "../../features/laboratory/laboratorySlice";

interface NotificationProps {

    notification: LaboratoryNotification | null;

}

export default function Notification({

    notification,

}: NotificationProps) {

    if (!notification) {

        return null;

    }

    const className = [
        styles.notification,

        styles[notification.type],
    ].join(" ");

    return (

        <aside className={className}>

            <h3>{notification.title}</h3>

            <p>{notification.message}</p>

        </aside>

    );

}
