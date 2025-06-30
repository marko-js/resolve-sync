export const external = () => false;
export const fs = {
  isFile() {
    throw new Error("isFile is not implemented by default outside of node.");
  },
  readPkg() {
    throw new Error("readPkg is not implemented by default outside of node.");
  },
};
