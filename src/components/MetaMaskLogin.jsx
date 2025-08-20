import React, { useState } from "react";
import { BrowserProvider, formatEther, parseEther } from "ethers"; // v6
import { getNonce, verifySignature, me } from "../api";

export default function MetaMaskLogin() {
  const [address, setAddress] = useState(null);
  const [balance, setBalance] = useState(null);
  const [token, setToken] = useState(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  // transaction states
  const [txRecipient, setTxRecipient] = useState("");
  const [txAmount, setTxAmount] = useState("");
  const [txStatus, setTxStatus] = useState("");

  const connect = async () => {
    setMsg("");
    if (!window.ethereum) {
      setMsg("MetaMask not found — install it.");
      return;
    }

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
      setMsg("User rejected connection or an error occurred.");
    }
  };

  const sendTransaction = async () => {
    if (!address) return setTxStatus("Connect wallet first");
    if (!txRecipient || !txAmount) return setTxStatus("Recipient and amount required");

    setTxStatus("Sending transaction…");
    try {
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const tx = await signer.sendTransaction({
        to: txRecipient,
        value: parseEther(txAmount)
      });

      setTxStatus(`Transaction sent. Hash: ${tx.hash}`);
      await tx.wait(); // wait for confirmation
      setTxStatus(`Transaction confirmed! Hash: ${tx.hash}`);

      // update balance after tx
      const bal = await provider.getBalance(address);
      setBalance(formatEther(bal));
    } catch (err) {
      console.error(err);
      setTxStatus("Transaction failed: " + (err.message || err));
    }
  };

  return (
    <div style={{ maxWidth: 680, margin: "20px auto", fontFamily: "system-ui, Arial" }}>
      <h2>MetaMask Connect & Sign-in Demo (ethers v6)</h2>

      {/* Connect & sign-in buttons */}
      <div style={{ marginBottom: 12 }}>
        <button onClick={connect}>Connect MetaMask</button>{" "}
      </div>

      {/* Wallet info */}
      <div style={{ marginBottom: 8 }}>
        <strong>Address:</strong> {address || "—"}
      </div>
      <div style={{ marginBottom: 8 }}>
        <strong>Balance:</strong> {balance ? `${balance} ETH` : "—"}
      </div>

      {/* Transaction UI */}
      {address && (
        <div style={{ marginTop: 20, padding: 12, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Send ETH Transaction</h3>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Recipient address"
              value={txRecipient}
              onChange={(e) => setTxRecipient(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              placeholder="Amount (ETH)"
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            />
          </div>
          <button onClick={sendTransaction}>Send Transaction</button>
          <div style={{ marginTop: 8, color: "teal" }}>{txStatus}</div>
        </div>
      )}

      {/* Status messages */}
      <div style={{ marginTop: 12, color: "teal" }}>{msg}</div>
    </div>
  );
}
