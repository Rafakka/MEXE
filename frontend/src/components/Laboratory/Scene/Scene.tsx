

import styles from "./Scene.module.css";

type SceneProps = {
  children: React.ReactNode;
};

export default function Scene({ children }: SceneProps) {
  return (
    <section className={styles.scene}>
      {children}
    </section>
  );
}
