import { Database } from 'bun:sqlite'
import { Elysia, type InferContext } from 'elysia'

class Decorators {
  public static db = new Database('app/dataset.sqlite', { strict: true })

  static () {
    this.db.exec('PRAGMA journal_mode = WAL')
  }
}

const app = new Elysia().decorate('db', Decorators.db)

const handler = ({ db, query, set }: InferContext<typeof app>) => {
  const totalCountSQL = `
    SELECT DISTINCT COUNT(id) AS count
    FROM municipalities
    WHERE ${query.search ? 'like($location, location)' : '$location'}
  `

  const resultSQL = `
    SELECT *
    FROM municipalities
    WHERE ${query.search ? 'like($location, location)' : '$location'}
    ORDER BY CASE $key
      WHEN 'name' THEN name
      WHEN 'location' THEN location
      WHEN 'temperature' THEN temperature
      ELSE id
    END ${query.order ? query.order.toUpperCase() : '' }
    ${query.limit ? ' LIMIT $limit' : ''}
    ${query.limit && query.offset ? ' OFFSET $offset' : ''}
  `

  const total = db.query(totalCountSQL).get({
    location: query.search ? `%${query.search}%` : 1
  }) as Record<'count', string>

  const result = db.query(resultSQL).all({
    location: query.search ? `%${query.search}%` : 1,
    key: query?.sort ? query.sort : 'id',
    limit: parseInt(query.limit),
    offset: parseInt(query.offset)
  })

  set.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, GET',
    'Content-Type': 'application/json',
    'X-Total-Count': total.count
  }

  return JSON.stringify(result)
}

app.get('/temp', handler).listen(process.env.PORT ?? 80)

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`)
