import appPromise from "../server.js";

export default async function handler(req: any, res: any) {
  // Await the fully-initialized Express app promise
  const app = await appPromise;
  // Handle request using Express router
  return app(req, res);
}
