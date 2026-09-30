// ─────────────────────────────────────────────────────────────────────────────
// set-password.js — set (or reset) the admin password without deleting anything.
//
//   node cms/set-password.js myNewPassword
//   node cms/set-password.js --random
//   node cms/set-password.js --list        (show the accounts that exist)
//
// Run it with the server stopped. Nothing else in the database is touched.
// ─────────────────────────────────────────────────────────────────────────────
'use strict';

const path = require('node:path');
const crypto = require('node:crypto');
const { open, createStore } = require('./lib/db');
const auth = require('./lib/auth');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const arg = process.argv[2];

const db = open(path.join(DATA_DIR, 'cms.db'));
const store = createStore(db);

if (!arg || arg === '--help') {
  console.log(`
  Usage:
    node cms/set-password.js <newPassword>    set the password
    node cms/set-password.js --random         generate one and print it
    node cms/set-password.js --list           list the accounts

  Run this with the server stopped.
`);
  process.exit(0);
}

const users = db.prepare('SELECT id, username FROM users ORDER BY id').all();

if (arg === '--list') {
  if (!users.length) console.log('\n  No admin account exists yet. Start the server once.\n');
  else console.log('\n  Accounts: ' + users.map(u => u.username).join(', ') + '\n');
  process.exit(0);
}

if (!users.length) {
  console.error('\n  No admin account exists yet. Start the server once first.\n');
  process.exit(1);
}

const password = arg === '--random' ? crypto.randomBytes(9).toString('base64url') : arg;
if (password.length < 8) {
  console.error('\n  Password must be at least 8 characters.\n');
  process.exit(1);
}

// Every existing account gets the new password, so a forgotten username is not
// a dead end either.
for (const u of users) store.setPassword(u.id, auth.hashPassword(password));

console.log('\n  Password updated for: ' + users.map(u => u.username).join(', '));
console.log('  New password: ' + password);
console.log('  (sign in at /admin and change it there if you like)\n');
