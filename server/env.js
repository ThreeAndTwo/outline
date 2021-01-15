// @flow
export default {
  URL: process.env.URL,
  DEPLOYMENT: process.env.DEPLOYMENT,
  SENTRY_DSN: process.env.SENTRY_DSN,
  TEAM_LOGO: process.env.TEAM_LOGO,
  SLACK_KEY: process.env.SLACK_KEY,
  SLACK_APP_ID: process.env.SLACK_APP_ID,
  SUBDOMAINS_ENABLED: process.env.SUBDOMAINS_ENABLED === "true",
  GOOGLE_ANALYTICS_ID: process.env.GOOGLE_ANALYTICS_ID,
  ALIS_ACCESS_KEY_ID: process.env.ALIS_ACCESS_KEY_ID,
  ALIS_SECRET_ACCESS_KEY: process.env.ALIS_SECRET_ACCESS_KEY,
  ALIS_REGION: process.env.ALIS_REGION,
  ALIS_BUCKET: process.env.ALIS_BUCKET,
};
