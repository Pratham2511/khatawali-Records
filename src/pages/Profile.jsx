import React, { useEffect, useState } from 'react';
import Loader from '../components/loader/Loader';
import { useAuth } from '../hooks/useAuth';
import { fetchProfile, requestEmailChange, requestPasswordChange, updateProfile } from '../services/authService';

const Profile = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState({ name: '', email: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data, error: fetchError } = await fetchProfile();
      if (fetchError) {
        setError(fetchError.message);
      } else if (data) {
        setProfile({ name: data.name || '', email: data.email || user.email });
      } else {
        setProfile({ name: user.user_metadata?.name || '', email: user.email });
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const handleProfileSave = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const { error: updateError } = await updateProfile({ name: profile.name });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Profile updated.');
    }
  };

  const handleEmailChange = async () => {
    setSaving(true);
    setError('');
    setMessage('');
    const { error: updateError } = await requestEmailChange(profile.email);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Email change requested. Check your inbox to confirm via OTP link.');
    }
  };

  const handlePasswordChange = async () => {
    if (!password) return;
    setSaving(true);
    setError('');
    setMessage('');
    const { error: updateError } = await requestPasswordChange(password);
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
    } else {
      setMessage('Password updated. Check email if verification is required.');
      setPassword('');
    }
  };

  if (loading) {
    return (
      <div className="loader-shell">
        <Loader />
      </div>
    );
  }

  return (
    <div className="row justify-content-center">
      <div className="col-lg-8">
        <div className="card p-4">
          <h3 className="mb-3">Profile</h3>
          {error && <div className="alert alert-danger py-2">{error}</div>}
          {message && <div className="alert alert-success py-2">{message}</div>}

          <div className="mb-3">
            <label className="form-label">Name</label>
            <input
              className="form-control"
              value={profile.name}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              value={profile.email}
              onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
            />
            <div className="form-text">Changing email triggers OTP verification.</div>
          </div>
          <div className="mb-3">
            <label className="form-label">Password</label>
            <input
              type="password"
              className="form-control"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="New password"
            />
            <div className="form-text">Changing password may require email OTP.</div>
          </div>

          <div className="d-flex gap-2">
            <button className="btn btn-primary" onClick={handleProfileSave} disabled={saving}>
              Save Name
            </button>
            <button className="btn btn-outline-primary" onClick={handleEmailChange} disabled={saving}>
              Request Email Change
            </button>
            <button className="btn btn-outline-secondary" onClick={handlePasswordChange} disabled={saving || !password}>
              Update Password
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
