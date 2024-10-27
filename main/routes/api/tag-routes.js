const router = require('express').Router();
const { Tag, Product, ProductTag } = require('../../models');

// The `/api/tags` endpoint

router.get('/', async (req, res) => {
    // find all tags
    try {
        const tagData = await Tag.findAll({
            // be sure to include its associated Product data
            include: [{
                model: Product,
                through: ProductTag,
                as: 'tagged_products'
            }]
        })
        if (!tagData) {
            res.status(404).json({ message: 'no tag with this id found' })
            return
        }
        res.status(200).json(tagData)
    } catch (err) {
        res.status(500).json(err)
    }
});

router.get('/:id', async (req, res) => {
    // find a single tag by its `id`
    try {
        const tagData = await Tag.findByPk(req.params.id, {
            // be sure to include its associated Product data
            include: [{
                model: Product,
                through: ProductTag,
                as: 'tagged_products'
            }]
        })
        if (!tagData) {
            res.status(404).json({ message: 'no tag with this id found' })
            return
        }
        res.status(200).json(tagData)
    } catch (err) {
        res.status(500).json(err)
    }
});

router.post('/', (req, res) => {
    Tag.create(req.body)
        .then((tag) => {
            // if there's product tags, we need to create pairings to bulk create in the ProductTag model
            if (req.body.productIds.length) {
                const productIds = req.body.productIds
                const tagId = tag.id
                const productTagIdArr = productIds.map((product_id) => {
                    return {
                        product_id,
                        tag_id: tagId,
                    };
                });
                return ProductTag.bulkCreate(productTagIdArr)
            }
            // if no product tags, just respond
            res.status(200).json(tag);
        })
        .then((productTagIds) => res.status(200).json(productTagIds))
        .catch((err) => {
            console.log(err);
            res.status(400).json(err);
        });
});

router.put('/:id', (req, res) => {
    // update a tag's name by its `id` value
    Tag.update(req.body, {
        where: {
            id: req.params.id,
        },
    })
        .then((tag) => {
            if (req.body.productIds && req.body.productIds.length) {

                ProductTag.findAll({
                    where: { tag_id: req.params.id }
                }).then((productTags) => {
                    // create filtered list of new tag_ids
                    const productTagIds = productTags.map(({ product_id }) => product_id);
                    const newProductTags = req.body.productIds
                        .filter((product_id) => !productTagIds.includes(product_id))
                        .map((product_id) => {
                            return {
                                tag_id: req.params.id,
                                product_id,
                            };
                        });

                    // figure out which ones to remove
                    const productTagsToRemove = productTags
                        .filter(({ product_id }) => !req.body.tagIds.includes(product_id))
                        .map(({ id }) => id);
                    // run both actions
                    return Promise.all([
                        ProductTag.destroy({ where: { id: productTagsToRemove } }),
                        ProductTag.bulkCreate(newProductTags),
                    ]);
                });
            }

            return res.json(tag);
        })
        .catch((err) => {
            // console.log(err);
            res.status(400).json(err);
        });
});

router.delete('/:id', async (req, res) => {
    // delete on tag by its `id` value
    try {
        const tagData = await Tag.destroy({
            where: {
                id: req.params.id
            }
        })
        if (!tagData) {
            res.status(404).json({ message: 'no tag with this id found' })
            return
        }
        res.status(200).json(tagData)
    } catch (err) {
        res.status(500).json(err)
    }
});

module.exports = router;
