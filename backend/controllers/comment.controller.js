const { PrismaClient } = require('@prisma/client')
const { badRequest } = require('./util')
const client = new PrismaClient()

//get all comments of an issue
exports.getComments = async (req, res) => {
	try {
		const { issueId } = req.params
		const cmts = await client.comment.findMany({
			where: { issueId: +issueId },
			include: { User: { select: { username: true, profileUrl: true } } },
		})
		const data = cmts.map(({ User, ...d }) => ({ ...d, ...User }))
		res.json(data).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

//create a comment to an issue
exports.createComment = async (req, res) => {
	try {
		const { projectId, ...data } = req.body
		const cmt = await client.comment.create({ data })
		res.json(cmt).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}

//delete a comment which I made
exports.deleteComment = async (req, res) => {
	try {
		await client.comment.delete({ where: { id: +req.params.id } })
		res.json({ message: 'The comment is deleted successfully' }).end()
	} catch (err) {
		console.log(err)
		return badRequest(res)
	}
}
