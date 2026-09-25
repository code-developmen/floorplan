export interface Region {
  id: string;
  label: string; // e.g. "Upper Cabinets"
  categoryId: string; // e.g. "cabinet-finish"
  points: { x: number; y: number }[]; // polygon in original image pixel space
}

/** categoryId must match an id in src/data/materials.ts. */
export const regions: Region[] = [
  // {
  //   "id": "kitchen-slab",
  //   "label": "Kitchen Slab",
  //   "categoryId": "kitchen-slab",
  //   "points": [
  //     {
  //       "x": 1585,
  //       "y": 1580
  //     },
  //     {
  //       "x": 1116,
  //       "y": 1550
  //     },
  //     {
  //       "x": 1237,
  //       "y": 1407
  //     },
  //     {
  //       "x": 312,
  //       "y": 1380
  //     },
  //     {
  //       "x": 12,
  //       "y": 1428
  //     },
  //     {
  //       "x": 9,
  //       "y": 1383
  //     },
  //     {
  //       "x": 88,
  //       "y": 1395
  //     },
  //     {
  //       "x": 281,
  //       "y": 1359
  //     },
  //     {
  //       "x": 387,
  //       "y": 1350
  //     },
  //     {
  //       "x": 1512,
  //       "y": 1374
  //     },
  //     {
  //       "x": 1582,
  //       "y": 1580
  //     }
  //   ]
  // },
  {
    "id": "right-cabinet",
    "label": "Right Cabinet",
    "categoryId": "cabinet-finish",
    "points": [
      {
        "x": 1579,
        "y": 1047
      },
      {
        "x": 1313,
        "y": 1044
      },
      {
        "x": 1379,
        "y": 1105
      },
      {
        "x": 1358,
        "y": 1123
      },
      {
        "x": 1295,
        "y": 1044
      },
      {
        "x": 1295,
        "y": 372
      },
      {
        "x": 1579,
        "y": 336
      },
      {
        "x": 1576,
        "y": 1044
      }
    ]
  },
  {
    "id": "drawers",
    "label": "Drawers",
    "categoryId": "drawer-finish",
    "points": [
      {
        "x": 1570,
        "y": 1592
      },
      {
        "x": 1573,
        "y": 2173
      },
      {
        "x": 1164,
        "y": 2119
      },
      {
        "x": 1155,
        "y": 1746
      },
      {
        "x": 296,
        "y": 1674
      },
      {
        "x": 18,
        "y": 1786
      },
      {
        "x": 24,
        "y": 1462
      },
      {
        "x": 321,
        "y": 1398
      },
      {
        "x": 1204,
        "y": 1432
      },
      {
        "x": 1101,
        "y": 1553
      },
      {
        "x": 1143,
        "y": 1571
      },
      {
        "x": 1567,
        "y": 1592
      }
    ]
  },
  {
    "id": "chimney-cover",
    "label": "Chimney Cover",
    "categoryId": "chimney-cover",
    "points": [
      {
        "x": 275,
        "y": 1090
      },
      {
        "x": 275,
        "y": 920
      },
      {
        "x": 330,
        "y": 929
      },
      {
        "x": 327,
        "y": 796
      },
      {
        "x": 106,
        "y": 723
      },
      {
        "x": 12,
        "y": 732
      },
      {
        "x": 9,
        "y": 1077
      },
      {
        "x": 118,
        "y": 1074
      },
      {
        "x": 278,
        "y": 1090
      }
    ]
  }
]