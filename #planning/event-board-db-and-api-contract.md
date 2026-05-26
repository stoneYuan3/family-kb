
DB design

CREATE TABLE board
id: SERIAL PRIMARY KEY
week_start: DATE NOT NULL UNIQUE
created_at TIMESTAMP DEFAULT NOW()

CREATE TABLE mark
id: SERIAL PRIMARY KEY
board_id: INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE
color: TEXT NOT NULL
data: JSONB NOT NULL
is_taped    BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMP DEFAULT NOW()

CREATE TABLE tape (
  id          SERIAL PRIMARY KEY,
  board_id    INTEGER NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
  x           REAL NOT NULL,
  y           REAL NOT NULL,
  width       REAL NOT NULL,
  height      REAL NOT NULL,
  created_at  TIMESTAMP DEFAULT NOW()
);

Color Set
id: autogen
color: color code
name: srting



Display Current Week
GET /api/board/current [any]
    { id, week_start, marks: [ ..., { id,color, weight, points } ] }
    //if 404 send a POST to create a board for this week

Display a Specific Board
GET /api/board/:id [any]
    { id, week_start, marks: [ ..., { id,color, weight, points } ] }

Display all boards in a list
GET /api/board [any]
    [ ..., { id, week_start } ]

Add a board
POST /api/board/:date [any] //auto action every new week

Edit a board //not sure where this can be used but i do think this may be needed in future
PATCH /api/board/:id [edit]

Add new marks 
POST /api/board/:id/marks [edit]

Edit a specific mark on board (color)
PATCH /api/mark/:id [edit]

Delete a specific mark
DELETE /api/mark/:id [edit]

Delete all marks on a board
DELETE /api/board/:id/marks [edit]

Delete a board
DELETE /api/board/:id [edit]

Display Color Sets
GET /api/color-set [any]

Add Color Sets
POST /api/color-set [edit]

Edit a Color Set
POST /api/color-set/:id [edit]

Delete a Color Set
DELETE /api/color-set/:id [edit]

