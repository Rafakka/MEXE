


from PIL import Image

class BlendProcessor:

    def blend(
            self,
            image1: Image.Image,
            image2: Image.Image
            ) -> Image.Image:
    
        return Image.blend(image1, image2, alpha=0.5)
