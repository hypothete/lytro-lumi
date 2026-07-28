import galleryData from "./assets/gallery.json";

type GalleryItem = {
  name: string;
  location: string;
}

export const items: GalleryItem[] = galleryData;

export function getGalleryDOM (container: HTMLDivElement, label: HTMLParagraphElement, selectItem: (url: string) => void) { 
  items.forEach(item => {
    const thumb = document.createElement('img');
    thumb.classList.add('gallery-item');
    thumb.src = item.location.replace("./gallery", "./gallery/thumbs");
    thumb.addEventListener("click", () => {
      makeGalleryLabel(label, item);
      selectItem(item.location);
    });
    container.appendChild(thumb);
  })
}

export function makeGalleryLabel(label: HTMLParagraphElement, item: GalleryItem) {
  label.textContent = item.name;
  const linkToSrc = document.createElement("a");
  linkToSrc.href = item.location;
  linkToSrc.classList.add('source-link');
  linkToSrc.setAttribute('target', '_blank');
  linkToSrc.textContent = 'view original';
  label.appendChild(linkToSrc);
}