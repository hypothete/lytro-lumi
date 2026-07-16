import galleryData from "./assets/gallery.json";

type GalleryItem = {
  name: string;
  location: string;
}

const items: GalleryItem[] = galleryData;

export function getGalleryDOM (container: HTMLDivElement, label: HTMLParagraphElement, selectItem: (url: string) => void) { 
  items.forEach(item => {
    const thumb = document.createElement('img');
    thumb.src = item.location.replace("./gallery", "./gallery/thumbs");
    thumb.addEventListener("click", () => {
      label.textContent = item.name;
      selectItem(item.location);
    });
    container.appendChild(thumb);
  })
}