import styles from "./SessionSavedMessage.module.css";

type SessionSavedMessageProps = {
    onReset: () => void;
    onContinue: () => void;
};

export default function SessionSavedMessage({
    onReset,
    onContinue,
}: SessionSavedMessageProps) {
    return (
        <div className={styles.overlay}>
            <div className={styles.panel}>

                <div className={styles.icon}>
                    ✓
                </div>

                <h2>Sessão salva</h2>

                <p>
                    Sua sessão foi salva com sucesso.
                </p>

                <div className={styles.actions}>

                    <button
                        type="button"
                        onClick={onReset}
                        aria-label="Resetar laboratório"
                    >
                        ↻
                        <span>Resetar</span>
                    </button>

                    <button
                        type="button"
                        onClick={onContinue}
                        aria-label="Continuar no laboratório"
                    >
                        ⟳
                        <span>Continuar</span>
                    </button>

                </div>

            </div>
        </div>
    );
}
