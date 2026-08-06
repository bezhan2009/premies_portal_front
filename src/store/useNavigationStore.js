import { create } from 'zustand';

const useNavigationStore = create((set) => ({
  links: [],
  flatLinks: [],
  setLinks: (links) => {
    const flatLinks = [];
    const traverse = (items) => {
      items.forEach(item => {
        if (item.href) {
            // Keep a reference to the parent structure or just the item itself
            flatLinks.push(item);
        }
        if (item.children) {
            traverse(item.children);
        }
      });
    };
    traverse(links);
    set({ links, flatLinks });
  }
}));

export default useNavigationStore;
