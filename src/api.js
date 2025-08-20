import axios from "axios";

const API_BASE = "http://localhost:5000/api";

export const getNonce = async (address) => {
  const res = await axios.get(`${API_BASE}/nonce`, { params: { address } });
  return res.data; // { address, nonce }
};

export const verifySignature = async (address, signature) => {
  const res = await axios.post(`${API_BASE}/verify`, { address, signature });
  return res.data; // { success, token }
};

export const me = async (token) => {
  const res = await axios.get(`${API_BASE}/me`, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
};

