

from PIL import Image

class NormalizeProcessor: 

    def normalize(self,
            image: Image.Image,
                  target_size: tuple[int,int]

                  ) -> Image.Image:
        
        image = image.convert("RGBA")
        image = image.resize(target_size)

        return image
