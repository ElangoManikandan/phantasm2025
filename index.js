// index.js - Serverless API entry point

import db from "../utils/db.js";
import jwt from "jsonwebtoken";
import { requireAuth } from "./middleware.js";
import nodemailer from "nodemailer";

export default async function handler(req, res) {
    if (req.method === "POST" && req.url === "/api/update-profile") {
        try {
            const { name, college, year, accommodation, phone } = req.body;
            const userId = req.user?.id;

            if (!userId) {
                return res.status(401).json({ error: "Unauthorized: User ID is missing." });
            }

            if (!name || !college || !year || !accommodation || !phone) {
                return res.status(400).json({ error: "All fields are required!" });
            }

            const [results] = await db.execute(
                "UPDATE users SET name = ?, college = ?, year = ?, accommodation = ?, phone = ? WHERE id = ?",
                [name, college, year, accommodation, phone, userId]
            );

            if (results.affectedRows === 0) {
                return res.status(400).json({ error: "Profile update failed." });
            }

            res.json({ message: "Profile updated successfully" });
        } catch (err) {
            res.status(500).json({ error: "An error occurred while updating the profile." });
        }
    } else if (req.method === "GET" && req.url === "/api/get-profile") {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ error: "Unauthorized: No user ID found in token" });
            }

            const userId = parseInt(req.user.userId, 10);
            const sqlQuery = "SELECT id, name, college, year, accommodation, role, phone, qr_code_id FROM users WHERE id = ?";
            const [results] = await db.query(sqlQuery, [userId]);

            if (!results || results.length === 0) {
                return res.status(404).json({ error: "User not found!" });
            }

            let user = results[0];
            if (!user.qr_code_id) {
                user.qr_code_id = `PSM_${user.id}`;
                await db.query("UPDATE users SET qr_code_id = ? WHERE id = ?", [user.qr_code_id, user.id]);
            }

            res.json(user);
        } catch (err) {
            res.status(500).json({ error: "Internal server error" });
        }
    } else if (req.method === "GET" && req.url === "/api/get-events") {
        try {
            const userId = req.user.userId;
            if (!userId) {
                return res.status(400).json({ error: "Invalid or missing userId" });
            }

            const [results] = await db.execute(
                "SELECT e.name AS eventName FROM events e INNER JOIN registrations r ON e.id = r.event_id WHERE r.user_id = ?",
                [userId]
            );

            if (results.length === 0) {
                return res.status(200).json({ message: "No events registered yet." });
            }

            res.status(200).json(results);
        } catch (error) {
            res.status(500).json({ error: "Database error", details: error.message });
        }
    } else if (req.method === "GET" && req.url === "/api/logout") {
        try {
            res.clearCookie("authToken", { path: "/" });
            res.status(200).json({ message: "Successfully logged out" });
        } catch (error) {
            res.status(500).json({ error: "Error logging out" });
        }
    } else {
        res.status(404).json({ error: "Route not found!" });
    }
}
