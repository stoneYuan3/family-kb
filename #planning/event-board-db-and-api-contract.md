
DB design

CREATE TABLE Boards
id: SERIAL PRIMARY KEY
week_start: DATE NOT NULL UNIQUE
created_at TIMESTAMP DEFAULT NOW()

CREATE TABLE Marks
id: SERIAL PRIMARY KEY
board_id: INTEGER NOT NULL REFERENCES board(id) ON DELETE CASCADE
color: TEXT NOT NULL
data: JSONB NOT NULL
is_taped    BOOLEAN NOT NULL DEFAULT FALSE,
created_at TIMESTAMP DEFAULT NOW()

CREATE TABLE tapes (
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
GET /api/boards/current [any]
    { id, week_start, marks: [ ..., { id,color, weight, points } ] }
    //if 404 send a POST to create a board for this week

Display a Specific Board
GET /api/boards/:id [any]
    { id, week_start, marks: [ ..., { id,color, weight, points } ] }

Display all boards in a list
GET /api/boards [any]
    [ ..., { id, week_start } ]

Add a board
POST /api/boards/:date [edit]

Edit a board //not sure where this can be used but i do think this may be needed in future
PATCH /api/boards/:id [edit]

Add new marks 
POST /api/boards/:id/marks [edit]

Edit a specific mark on board (color)
PATCH /api/marks/:id [edit]

Delete a specific mark
DELETE /api/marks/:id [edit]

Delete all marks on a board
DELETE /api/boards/:id/marks [edit]

Delete a board
DELETE /api/boards/:id [edit]

Display Color Sets
GET /api/color-sets [any]

Add Color Sets
POST /api/color-sets [edit]

Edit a Color Set
POST /api/color-sets/:id [edit]

Delete a Color Set
DELETE /api/color-sets/:id [edit]

