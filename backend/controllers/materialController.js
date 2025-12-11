const Material = require('../models/Material');

exports.getAllMaterials = async (req, res) => {
  try {
    const materials = await Material.find().sort({ createdAt: -1 });
    res.json(materials);
  } catch (error) {
    res.status(500).json({ message: 'Lỗi server', error });
  }
};

exports.createMaterial = async (req, res) => {
  try {
    const data = req.body;
    const material = await Material.create(data);
    res.status(201).json(material);
  } catch (error) {
    res.status(400).json({ message: 'Tạo vật liệu thất bại', error });
  }
};

exports.updateMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findByIdAndUpdate(id, req.body, {
      new: true,
    });
    if (!material) return res.status(404).json({ message: 'Không tìm thấy vật liệu' });
    res.json(material);
  } catch (error) {
    res.status(400).json({ message: 'Cập nhật thất bại', error });
  }
};

exports.deleteMaterial = async (req, res) => {
  try {
    const { id } = req.params;
    const material = await Material.findByIdAndDelete(id);
    if (!material) return res.status(404).json({ message: 'Không tìm thấy vật liệu' });
    res.json({ message: 'Đã xóa vật liệu' });
  } catch (error) {
    res.status(400).json({ message: 'Xóa thất bại', error });
  }
};
