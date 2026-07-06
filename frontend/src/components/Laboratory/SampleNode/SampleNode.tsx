

import styles from "./SampleNode.module.css";

type Props = {

    side:"left"|"right";

}

export default function SampleNode({side}:Props){

    return(

        <div className={`${styles.node} ${styles[side]}`} />

    )

} 
