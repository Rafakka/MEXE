

from PIL import Image

from io import BytesIO

def test_blend(client):

    data = {
            "width":500,
            "height":300,
            }
    
    img1 = Image.new('RGB',(800,600),(255,255,255))

    buffer1 = BytesIO()

    img1.save(buffer1, format="PNG")

    buffer1.seek(0)
    
    img2 = Image.new('RGBA',(500,500),(255,0,0,255))
    
    buffer2 = BytesIO()

    img2.save(buffer2, format="PNG")

    buffer2.seek(0)
    
    images = { 
              "implicit_image_a":("img1.png",buffer1),
              "implicit_image_b":("img2.png",buffer2)
              }
    
    blended_img = client.post(
            "/blend",
            files=images,
            data=data
            ) 

    assert blended_img.status_code == 200 
