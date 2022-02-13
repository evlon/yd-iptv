import { execSync } from 'child_process';
import { gitee_login_with_obj_cookie, pagebuild_with_obj_cookie } from 'gitee-pages-build';

export async function gitPushToServer() {

    //发布
    await gitee_login_with_obj_cookie();

    await pagebuild_with_obj_cookie();
}
