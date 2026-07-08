

import styles from "./SampleNode.module.css";

type SampleNodeProps = {
    loaded: boolean;
}


export default function SampleNode({loaded}:SampleNodeProps){

    return(

        <div

    className={`

        ${styles.node}
        ${loaded ? styles.loaded : styles.pending }

            `}

        />   
    
    )

}
