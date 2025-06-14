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
  let sql = 'SELECT * FROM municipalities'

  const regex = /(?<order>^-|)(?<field>[a-zA-Z-_]+)/mi
  const sorting = query.sort?.match(regex)?.groups

  const values = {
    location: query.search ? `%${ query.search }%` : 1,
    limit: parseInt(query.limit),
    offset: parseInt(query.offset),
    field: sorting?.field ? sorting.field : 'id'
  }

  sql += ` WHERE ${ query.search ? 'like($location, location)' : '$location' }`
  sql += ` ORDER BY CASE $field WHEN 'name' THEN name WHEN 'location' THEN location WHEN 'temperature' THEN temperature ELSE id END ${ sorting?.order === '-' ? 'DESC' : 'ASC' }`
  sql += query.limit ? ' LIMIT $limit' : ''
  sql += query.limit && query.offset ? ' OFFSET $offset' : ''

  set.headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': '*',
    'Access-Control-Allow-Methods': 'OPTIONS, GET, POST, PUT, DELETE',
    'Content-Type': 'application/json'
  }
  
  return JSON.stringify(db.query(sql).all(values))
}

app.get('/temp', handler).listen(process.env.PORT ?? 80)

console.log(`Server running at ${app.server?.hostname}:${app.server?.port}`)
