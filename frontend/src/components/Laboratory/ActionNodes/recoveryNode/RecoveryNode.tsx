
import styles from "./RecoveryNode.module.css";

type RecoveryNodeProps = {
    visible: boolean;
};

export default function RecoveryNode({
    visible
}: RecoveryNodeProps) {

    return (
        <div
            className={`${styles.node} ${
                visible ? styles.visible : styles.hidden
            }`}
            aria-hidden={!visible}
        >
            <span />
            <span />
            <span />
            <span />
            <span />
        </div>
    );
}
