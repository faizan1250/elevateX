// config/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');
const crypto = require('crypto');

passport.serializeUser((user, done) => {
  done(null, user.id);
});
passport.deserializeUser((id, done) => {
  User.findById(id).then(user => done(null, user));
});


passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });

        if (!user) {
          user = await User.create({
            provider: 'google',
            googleId: profile.id,
            username: profile.displayName,
            email: profile.emails?.[0]?.value || '', // safer fallback
            verified: true, 
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


passport.use(new GitHubStrategy({
  clientID: process.env.GITHUB_CLIENT_ID,
  clientSecret: process.env.GITHUB_CLIENT_SECRET,
  callbackURL: process.env.GITHUB_CALLBACK_URL,
  scope: ['user:email'],
}, async (accessToken, refreshToken, profile, done) => {
  try {
    let email;

    // If profile.emails is missing or empty, fetch emails manually
    if (!profile.emails || profile.emails.length === 0) {
      const emailRes = await axios.get('https://api.github.com/user/emails', {
        headers: {
          Authorization: `token ${accessToken}`,
          'User-Agent': 'elevatex-app',
        },
      });

      const primaryEmail = emailRes.data.find(e => e.primary && e.verified);
      email = primaryEmail?.email || emailRes.data[0]?.email;
    } else {
      email = profile.emails[0].value;
    }

    if (!email) return done(new Error("GitHub email not found"));

    // Proceed with email (register or login)
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        username: profile.username,
        // Set a dummy password or bypass password validation (see note below)
        password: crypto.randomBytes(20).toString("hex"),
        provider: 'github',
        verified: true, 
      });
    }

    done(null, user);
  } catch (err) {
    console.error("GitHub Strategy error:", err);
    done(err, null);
  }
}));