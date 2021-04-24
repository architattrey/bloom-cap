Generate api doc 
apidoc -i api -o public/docs/
Ref : http://apidocjs.com/


Set all documents to true:
db.questions.update(
    {
        'isActive':false
    },
    {
        $set:{'isActive':true}
    },
    { multi: true}
    )


, {
    new: true, //   Returns updated data
    lean: true  //    Returns json instead of mongoose model
}


//  Empty array
db.questions.update(
{userIds:{$exists: true}},
{
"$pull":{userIds:{$exists: true}}
},
{
multi:true
}
)

// Get question count by unit and type- Full example of match, unwind (array group), group with multiple value, projection and sort


db.questions.aggregate([
//{
//	$match:{"units":ObjectId('5a0c364edf483f484438e00a')}
//},
{
  	$unwind:"$units"
}
,{
	$group:{
		_id:{questionType:"$questionType",unit:"$units"},
		count:{$sum:1}
	}
}
//,{
//	$project:{
//		units:1,
//		questionsText:1
//	}
//}
,{
	$lookup:{
	  	from:"units",
	  	localField:"_id.unit",
	  	foreignField:"_id",
	  	as: "unitName"
	}
}
,{
	$project:{
	  	_id:0,
		unit:"$_id.unit",
		type:"$_id.questionType",
		unitName:"$unitName.name",
		count:"$count"
	}
}
,{
	$unwind:"$unitName"
}
,{
	$sort:{count:-1}
}
])

//	Mongo db conditional operator
https://stackoverflow.com/questions/36299022/how-to-get-multiple-counts-in-one-query-for-one-field
{name:'hi',price:100},
{name:'hi',price:134},
{name:'hi',price:500}

db.collection.aggregate([
    { "$match": {
        "price": { "$gte": 100, "$lte" 500 }
    }},
    { "$group": {
        "_id": {
            "$cond": [
                { "$lte": [ "$price", 200 ] },
                "100-200
                { "$cond": [
                    { "$lte": [ "$price", 300 ] },
                    "200-300",
                    { "$cond": [
                        { "$lte": [ "$price", 400 ] },
                        "300-400",
                        "400-500"
                    ]}
                ]}
            ]
        },
        "count": { "$sum": 1 }
    }}
])

{ "_id": "100-200", "count": 2 }
{ "_id": "400-500", "count": 1 }


//  Get attempted, correct, incorrect and skipped question count on practice:

db.practices.aggregate([
{
	$unwind:"$questions"
}
,{
	$group:{
		_id:"$questions.questionId",
		attempatedCount:{$sum:1},
		correctCount:{
		  $sum:{
		    $cond:[{
		      $eq:["$questions.status","correct"]
		    }
		    ,1,0]}},
		inCorrectCount:{
		  $sum:{
		    $cond:[{
		      $eq:["$questions.status","incorrect"]
		    }
		    ,1,0]}},
		skipCount:{
		  $sum:{
		    $cond:[{
		      $eq:["$questions.status","skipped"]
		    }
		    ,1,0]}},
		unknownCount:{
		  $sum:{
		    $cond:[{
		      $eq:["$questions.status","unknown"]
		    }
		    ,1,0]}}
	}
}
,{
	$sort:{"attempatedCount":-1}
}

])


