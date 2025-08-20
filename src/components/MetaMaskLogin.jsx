import React, { useState } from "react";
import { BrowserProvider, formatEther } from "ethers";

// This assumes your backend exposes /api/nonce, /api/verify, and /api/send endpoints
export default function MetaMaskAuthTx() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [token, setToken] = useState(localStorage.getItem("mm_token"));
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // Transaction UI states
  const [txRecipient, setTxRecipient] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");

  // Connect MetaMask & fetch balance
  const connect = async () => {
    setMsg("");
    if (!window.ethereum) return setMsg("MetaMask not found — install it.");

    try {
      const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
      const acct = accounts[0];
      setAddress(acct);

      const provider = new BrowserProvider(window.ethereum);
      const bal = await provider.getBalance(acct);
      setBalance(formatEther(bal));
      setMsg("Wallet connected.");
    } catch (err) {
      console.error(err);
      setMsg("Connection failed: " + (err.message || err));
    }
  };

  // Sign nonce from backend and authenticate
  const signIn = async () => {
    if (!address) return setMsg("Connect wallet first");
    setLoading(true);
    setMsg("");

    try {
      // 1. request nonce
      const nonceResp = await fetch(`http://localhost:5000/api/nonce?address=${address}`);
      const { nonce } = await nonceResp.json();

      // 2. sign nonce with MetaMask
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const signature = await signer.signMessage(nonce);

      // 3. verify signature via backend
      const verifyResp = await fetch("http://localhost:5000/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature })
      });
      const verifyData = await verifyResp.json();

      if (verifyData.token) {
        setToken(verifyData.token);
        localStorage.setItem("mm_token", verifyData.token);
        setMsg("Authentication successful!");
      } else {
        setMsg("Authentication failed.");
      }
    } catch (err) {
      console.error(err);
      setMsg("Authentication error: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  // Send ETH via backend (authenticated)
  const sendTransaction = async () => {
    if (!token) return setTxStatus("Authenticate first");
    if (!txRecipient || !txAmount) return setTxStatus("Recipient and amount required");

    setTxStatus("Sending transaction…");

    try {
      const resp = await fetch("http://localhost:5000/send", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ to: txRecipient, amount: txAmount })
      });
      const data = await resp.json();

      if (resp.ok) {
        setTxStatus(`Tx confirmed! Hash: ${data.txHash}`);
        // Optionally refresh balance
        const provider = new BrowserProvider(window.ethereum);
        const bal = await provider.getBalance(address);
        setBalance(formatEther(bal));
      } else {
        setTxStatus("Tx failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      setTxStatus("Tx error: " + (err.message || err));
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "20px auto", fontFamily: "system-ui, Arial" }}>
      <h2>MetaMask Auth & Transaction Demo</h2>

      <div style={{ marginBottom: 12 }}>
        <button onClick={connect}>Connect MetaMask</button>{" "}
        <button onClick={signIn} disabled={!address || loading}>
          {loading ? "Signing…" : "Sign-in (nonce)"}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <strong>Address:</strong> {address || "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Balance:</strong> {balance ? `${balance} ETH` : "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>JWT:</strong> {token ? token.slice(0, 30) + "…" : "Not authenticated"}
      </div>
      <div style={{ marginTop: 12, color: "teal" }}>{msg}</div>

      {/* Transaction UI only enabled after auth */}
      {token && (
        <div style={{ marginTop: 20, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Send ETH Transaction</h3>
          <input
            type="text"
            placeholder="Recipient address"
            value={txRecipient}
            onChange={(e) => setTxRecipient(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <input
            type="text"
            placeholder="Amount (ETH)"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            style={{ width: "100%", padding: 8, marginBottom: 8 }}
          />
          <button onClick={sendTransaction}>Send ETH</button>
          <div style={{ marginTop: 8, color: "teal" }}>{txStatus}</div>
        </div>
      )}
    </div>
  );
}
