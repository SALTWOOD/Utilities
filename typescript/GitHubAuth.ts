app.get("/api/auth/id", (req: Request, res: Response) => {
    res.end(id);
});
app.post("/api/auth/login", async (req: Request, res: Response) => {
    res.set("Content-Type", "application/json");

    try {
        const code = req.query.code as string || '';

        // 请求GitHub获取access_token
        const tokenData = await got.post(`https://${Config.instance.github.url.normal}/login/oauth/access_token`, {
            form: {
                code,
                client_id: id,
                client_secret: secret
            },
            headers: {
                'Accept': 'application/json'
            },
            responseType: 'json'
        }).json<{ access_token: string }>();

        const accessToken = tokenData.access_token;

        let userResponse = await got(`https://${api}/user`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/json',
                'User-Agent': 'Open93AtHome-V3/3.0.0' // GitHub API要求设置User-Agent
            }
        }).json<{ id: number, login: string, avatar_url: string, name: string }>();

        const githubUser = GitHubUser.create(
            userResponse.id,
            userResponse.name || userResponse.login || '',
            userResponse.avatar_url
        );

        // 处理数据库操作
        let dbUser = await db.getEntity<UserEntity>(UserEntity, githubUser.id);
        if (dbUser) {
            await db.update<UserEntity>(UserEntity, await githubUser.toUserWithDbEntity(dbUser));
        } else {
            await db.insert<UserEntity>(UserEntity, githubUser.toUserEntity());
        }

        // 生成JWT并设置cookie
        const token = JwtHelper.instance.issueToken({
            userId: githubUser.id,
            clientId: id
        }, Constants.TOKEN_USER_AUDIENCE, Constants.SECONDS_IN_DAY * Config.instance.user.tokenExpiration);

        res.cookie('pw-token', token, Constants.GetBrowserCookieOptions());
        const user = await db.getEntity<UserEntity>(UserEntity, githubUser.id);
        res.status(200).json(user);
    } catch (error) {
        const err = error as Error;
        console.error('Error processing GitHub OAuth:', err);
        res.status(500).json({
            error: `${err.name}: ${err.message}`
        });
    }
});