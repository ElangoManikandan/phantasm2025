// index.js - Serverless API entry point

export default async function handler(req, res) {
    if (req.method === "GET" && req.url === "/api/test") {
        return res.status(200).json({ message: "Server is working!" });
    }
    return res.status(404).json({ error: "Route not found!" });
}
