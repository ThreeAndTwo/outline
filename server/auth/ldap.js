// @flow

import ldapClient from "ldapjs"
import Router from "koa-router";
import methodOverride from "../middlewares/methodOverride";
import validation from "../middlewares/validation";
import addHours from "date-fns/add_hours";
import {getCookieDomain} from "../utils/domains";
import {v4 as uuidv4} from "uuid";
import {Event, Team, User} from "../models";
import Sequelize from "sequelize";
import invariant from "invariant";
import auth from "../middlewares/authentication";
import crypto from "crypto";
import addMonths from "date-fns/add_months";

const router = new Router();
router.use(methodOverride());
router.use(validation());

router.post("ldap", async (ctx) => {
    const {username, password} = ctx.body;

    ctx.assertPresent(username, "ldapID is required!");
    ctx.assertPresent(password, "password is required!");

    const team = await Team.findByPk(process.env.TEAM_ID);

    // ps: ctx.redirect 并不发生实质性的跳转
    let authInfo = [];
    try {
        const authRes = await ldapAuth(username, password);
        authInfo = JSON.parse(authRes);
    } catch (e) {
        console.log("用户名或密码不正确!");
        ctx.body = {
            redirect: `${team.url}?notice=ldap_validation`,
            message: "认证失败，请重新尝试登陆",
            success: false,
        };
        // 跳转到错误页面
        return;
    }

    const user = await User.findOne({
        where: {name: username},
    });

    if (user) {

        if (!team) {
            ctx.redirect(`/?notice=auth-error`);
            return;
        }

        if (user.service && "ldap" !== user.service) {
            ctx.body = {
                redirect: `${team.url}/auth/${user.service}`,
            };
            return;
        }

        console.log("认证成功", `${team.url}/auth/ldap.callback?ldapId=${username}`);
        ctx.body = {
            redirect: `${team.url}/auth/ldap.callback?ldapId=${username}&email=${authInfo.mail}`
        };
        return;
    }

    ctx.body = {
        redirect: `${team.url}/auth/ldap.callback?ldapId=${username}&email=${authInfo.mail}`
    };
});

router.get("ldap.callback", auth({required: false}), async (ctx) => {
    console.log(ctx.request.query);
    const {ldapId, email} = ctx.request.query;
    const state = Math.random().toString(36).substring(7);
    ctx.cookies.set("state", state, {
        httpOnly: false,
        expires: addHours(new Date(), 1),
        domain: getCookieDomain(ctx.request.hostname),
    });

    let userPrimary = uuidv4();
    let team, isFirstUser;
    try {
        [team, isFirstUser] = await Team.findOrCreate({
            where: {
                name: "wiki",
            },
            defaults: {
                name: "wiki",
                avatarUrl: "https://a.slack-edge.com/80588/img/avatars-teams/ava_0017-88.png",
            },
        });
    } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
            ctx.redirect(`/?notice=auth-error`);
            ctx.status(307);
            return;
        }
    }
    invariant(team, "Team must exist");

    try {
        const [user, isFirstSignin] = await User.findOrCreate({
            where: {name: ldapId},
            defaults: {
                id: userPrimary,
                email: email,
                username: ldapId,
                name: ldapId,
                isAdmin: isFirstUser,
                serviceId: md5Crypto(ldapId),
                createdAt: new Date(),
                updatedAt: new Date(),
                lastActiveAt: new Date(),
                lastActiveIp: ctx.request.ip,
                lastSignedInAt: new Date(),
                lastSignedInIp: ctx.request.ip,
                teamId: "db26c69a-2983-41f9-94ac-33a0785c2e0e",
                avatarUrl: "https://wiki.eschain.tech/images/icons/profilepics/default.svg",
                service: "ldap",
                language: "zh_CN",
            },
        });

        if (isFirstUser) {
            await team.provisionFirstCollection(userPrimary);
            await team.provisionSubdomain(team.domain);
        }

        ctx.signIn(user, team, "ldap", isFirstSignin);
    } catch (err) {
        if (err instanceof Sequelize.UniqueConstraintError) {
            const exists = await User.findOne({
                where: {
                    service: "ldap",
                    email: email,
                    teamId: team.id,
                },
            });

            if (exists) {
                ctx.redirect(`${team.url}?notice=email-auth-required`);
            } else {
                ctx.redirect(`${team.url}?notice=auth-error`);
            }
        }
        throw err;
    }

});

function md5Crypto(str) {
    const hash = crypto.createHash('md5')
    hash.update(str)
    return hash.digest('hex');
}

function ldapAuth(ldapname, ldapwd) {
    let client = ldapClient.createClient({url: process.env.LDAP_URL});
    let opts = {
        filter: '(cn=' + ldapname + ')', //查询条件过滤器, 查找username该用户节点
        scope: 'sub', //查询范围
        timeLimit: 500 // 超时
    };

    return new Promise(function (resolve, reject) {
        let userText = "";

        const userPath = process.env.LDAP_SEARCH_STD + "=" + ldapname + "," + process.env.LDAP_BASE_DN

        client.bind(ldapname, ldapwd, function (err, resp) {
            client.search(userPath, opts, function (err, res) {
                // 查询结果事件响应

                res.on('searchEntry', function (entry) {
                    console.log("into searchEntry");
                    //获取查询的对象
                    let user = entry.object;
                    console.log("dn:", user.dn);
                    userText = JSON.stringify(user, null, 2);
                    // //校验该用户的密码是否ok
                    client.bind(user.dn, ldapwd, function (err, res) {
                        if (err) {
                            console.log('验证失败！用户名或密码错误');
                            reject(err);
                        } else {
                            // users 表中是否有该记录
                            console.log("验证成功");
                            console.log("userText:", userText);
                            // const userArr = JSON.parse(userText);

                            console.log("验证通过，success！！！" + res);
                            resolve(userText);
                        }
                    });
                });

                res.on('searchReference', function (referral) {
                    console.log("referral:" + referral.uris.join());
                });

                // 查询错误事件
                res.on('error', function (err) {
                    console.log("ldap sev had error:", err.message);
                    // 解除绑定操作
                    client.unbind();
                });

                // 查询结束
                res.on('end', function (res) {
                    console.log('search status:' + res.status);
                    // 解除绑定操作
                    client.unbind();
                });
            })
        });
    });
}

export default router;
