import { useEffect, useState } from 'react';
import axios from 'axios';

const API = 'http://localhost:5000';

function App() {
  const [symbol, setSymbol] = useState('AAPL');
  const [type, setType] = useState('above');
  const [targetPrice, setTargetPrice] = useState('150');
  const [alerts, setAlerts] = useState([]);
  const [status, setStatus] = useState('');

  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [user, setUser] = useState(null);

  const loadAlerts = async () => {
    try {
      const res = await axios.get(`${API}/alerts`);
      setAlerts(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAlerts();
  }, []);

  const createAlert = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/alerts`, { symbol, type, targetPrice: Number(targetPrice) });
      setStatus('Alert created');
      await loadAlerts();
    } catch (error) {
      setStatus('Error creating alert');
    }
  };

  const deleteAlert = async (id) => {
    await axios.delete(`${API}/alerts/${id}`);
    await loadAlerts();
  };

  const checkStock = async () => {
    try {
      const res = await axios.post(`${API}/check`, { symbol });
      setStatus(`Current ${res.data.symbol} price ${res.data.currentPrice}. Triggered ${res.data.triggeredAlerts.length} alerts.`);
      await loadAlerts();
    } catch (error) {
      setStatus('Error checking stock');
    }
  };

  const checkAll = async () => {
    try {
      const res = await axios.post(`${API}/check-all`);
      const triggeredTotal = res.data.results.reduce((a, item) => a + (item.triggeredAlerts?.length || 0), 0);
      setStatus(`Checked ${res.data.results.length} symbols, triggered ${triggeredTotal} total alerts.`);
      await loadAlerts();
    } catch (error) {
      setStatus('Error checking all symbols');
    }
  };

  const registerUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/register`, { email: regEmail, password: regPassword });
      setStatus(`Registered ${res.data.email}`);
      setRegEmail('');
      setRegPassword('');
    } catch (error) {
      setStatus(error.response?.data?.error || 'Registration failed');
    }
  };

  const loginUser = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API}/login`, { email: loginEmail, password: loginPassword });
      setStatus(res.data.message);
      setUser({ id: res.data.id, email: res.data.email });
      setLoginEmail('');
      setLoginPassword('');
    } catch (error) {
      setStatus(error.response?.data?.error || 'Login failed');
    }
  };

  const logout = () => {
    setUser(null);
    setStatus('Logged out');
  };

  return (
    <div className="app">
      <h1>Stock Price Alert System</h1>

      <div style={{ marginBottom: '16px' }}>
        {user ? (
          <div>
            <strong>Signed in as:</strong> {user.email} <button onClick={logout}>Logout</button>
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '8px' }}>
            <form onSubmit={registerUser} className="form" style={{ border: '1px solid #DDD', padding: '12px', borderRadius: '8px' }}>
              <h3>Register</h3>
              <label>Email<input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} type="email" required /></label>
              <label>Password<input value={regPassword} onChange={(e) => setRegPassword(e.target.value)} type="password" required /></label>
              <button type="submit">Register</button>
            </form>
            <form onSubmit={loginUser} className="form" style={{ border: '1px solid #DDD', padding: '12px', borderRadius: '8px' }}>
              <h3>Login</h3>
              <label>Email<input value={loginEmail} onChange={(e) => setLoginEmail(e.target.value)} type="email" required /></label>
              <label>Password<input value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} type="password" required /></label>
              <button type="submit">Login</button>
            </form>
          </div>
        )}
      </div>

      <form onSubmit={createAlert} className="form">
        <label>Symbol<input value={symbol} onChange={(e) => setSymbol(e.target.value.toUpperCase())} /></label>
        <label>Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="above">Above</option>
            <option value="below">Below</option>
          </select>
        </label>
        <label>Target Price<input value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} type="number" step="0.01" /></label>
        <button type="submit">Create Alert</button>
      </form>

      <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
        <button onClick={checkStock}>Check {symbol} Price</button>
        <button onClick={checkAll}>Check All Alerts</button>
      </div>
      <p>{status}</p>

      <h2>Alerts</h2>
      <ul>
        {alerts.map((a) => (
          <li key={a.id} className={a.triggered ? 'triggered' : ''}>
            {a.symbol} {a.type} {a.targetPrice} - {a.triggered ? 'Triggered' : 'Pending'}
            <button onClick={() => deleteAlert(a.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;
