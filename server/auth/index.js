// @flow
import addMonths from "date-fns/add_months";
import Koa from "koa";
import Cors from "koa-cors";
import bodyParser from "koa-body";
import Router from "koa-router";
import { AuthenticationError } from "../errors";
import auth from "../middlewares/authentication";
import validation from "../middlewares/validation";
import { Team } from "../models";

import email from "./email";
import google from "./google";
import slack from "./slack";
import ldap from "./ldap";
import invitation from "./invitation";

const app = new Koa();
app.use(Cors());
const router = new Router();

router.use("/", slack.routes());
router.use("/", google.routes());
router.use("/", email.routes());
router.use("/", ldap.routes());
router.use("/", invitation.routes());

router.get("/redirect", auth(), async (ctx) => {
  const user = ctx.state.user;
  const jwtToken = user.getJwtToken();

  if (jwtToken === ctx.params.token) {
    throw new AuthenticationError("Cannot extend token");
  }

  // ensure that the lastActiveAt on user is updated to prevent replay requests
  await user.updateActiveAt(ctx.request.ip, true);

  ctx.cookies.set("accessToken", jwtToken, {
    httpOnly: false,
    expires: addMonths(new Date(), 3),
  });

  const team = await Team.findByPk(user.teamId);
  ctx.redirect(`${team.url}/home`);
});

app.use(bodyParser());
app.use(validation());
app.use(router.routes());

export default app;
