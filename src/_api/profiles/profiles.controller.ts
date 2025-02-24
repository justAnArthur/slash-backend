import jwt from "@/src/_common/jwt"
import { getAuthUserId, notFound, unauthorized } from "@/src/_common/utils"
import Elysia, { t } from "elysia"
import { ProfileService } from "./profiles.service"

const profilesController = new Elysia({ prefix: "/profiles" }).use(jwt).guard(
  {
    beforeHandle({ headers: { authorization, ...headers } }) {
      if (!authorization || authorization.toString() === "") {
        throw unauthorized()
      }
    }
  },
  (app) =>
    app
      .resolve(getAuthUserId)
      .get(
        ":username",
        ({ params, userId }) => {
          const profile = ProfileService.get(params.username, userId)
          if (!profile) {
            throw notFound()
          }
          return { profile }
        },
        {
          params: t.Object({
            username: t.String()
          })
        }
      )
      .post(
        ":username/follow",
        ({ params, userId }) => {
          const profile = ProfileService.follow(params.username, userId)
          return { profile }
        },
        {
          params: t.Object({
            username: t.String()
          })
        }
      )
      .delete(
        ":username/follow",
        ({ params, userId }) => {
          const profile = ProfileService.unfollow(params.username, userId)
          return { profile }
        },
        {
          params: t.Object({
            username: t.String()
          })
        }
      )
)

export default profilesController
