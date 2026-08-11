

import styles from "./ReactionPanel.module.css";
import type {LaboratoryPhase} from "../../../features/laboratory/laboratoryPhase";
import type {OperationPhase} from "../../../features/laboratory/operationPhase";
import type {ImageMetadata} from "../../../types/imageType";

type ReactionPanelProps = {
    phase: LaboratoryPhase;
    visible: boolean;
    operationPhase: OperationPhase;
    resultUrl?: string | null;
    resetting:  boolean;
    metadata?: ImageMetadata | null;
};

export default function ReactionPanel({phase, operationPhase, visible, resultUrl, resetting, metadata }:ReactionPanelProps){

    console.log("REACTION PANEL METADATA:", metadata);

    return(

        <section
            className={`
                ${styles.panel}
                ${styles[phase]}
                ${styles[operationPhase]}
                ${visible ? styles.visible: styles.hidden}
                ${resetting ? styles.resetting: ""}
            `}
        >

        <div className={styles.connector} >

            <div className={styles.line}></div>

            <div className={styles.line}></div>

            <div className={styles.line}></div>

        </div>

        <div className={styles.surface}>

            <div className={styles.preview}>
                {resultUrl && (
                    <img
                        src={resultUrl}
                        alt="Merged result"
                        className={styles.image}
                    />
                )}
            </div>

    <div className={styles.metadata}>

    {metadata?.width !== undefined &&
     metadata?.height !== undefined && (
        <span>
            {metadata.width} × {metadata.height}
        </span>
    )}

    {metadata?.type && (
        <span>
            {metadata.type
                .replace("image/", "")
                .toUpperCase()}
        </span>
    )}

    {metadata?.size !== undefined && (
        <span>
            {(metadata.size / 1024 / 1024).toFixed(2)} MB
        </span>
    )}

    </div>
            <div className={styles.scanner}></div>

            <div className={styles.borderFlow}>

            <div className={styles.top}></div>

            <div className={styles.right}></div>

            <div className={styles.bottom}></div>

            <div className={styles.left}></div>

        </div>

    </div>

        </section>

    );

}
