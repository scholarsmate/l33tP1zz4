// app/static/ts/custom.d.ts

// Declare a module for JPEG images
declare module "*.jpeg" {
    const content: string;
    export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

// Declare a module for MP3 files
declare module "*.mp3" {
    const content: string;
    export default content;
}
