

import styles from "./Layout.module.css";


type LayoutProps = {
  children: React.ReactNode;
};

export default function Layout({ children }: LayoutProps) {
  return (
    <main className={styles.layout}>
      {children}
    </main>
  );
}
