from PIL import Image

from app.settings import DEFAULT_BLEND_ALPHA

import logging

logger = logging.getLogger(__name__)

class BlendProcessor:

    def blend(
            self,
            image1: Image.Image,
            image2: Image.Image
            ) -> Image.Image:

        logger.info(
                "Blending images(%dx%d) using alpha=%S",
                image1.width,
                image1.height,
                DEFAULT_BLEND_ALPHA
                )
    
        blended = Image.blend(image1, image2, alpha=DEFAULT_BLEND_ALPHA)
        
        logger.info(
                "Blending successful(%dx%d)",
                blended.width,
                blended.height
                )

        return blended
